export default function DoctorCard({ doctor, onClick }) {
    return (
        <div
            className="rounded-3xl bg-white shadow-xl p-8 flex flex-col items-center text-center h-full border border-blue-100 hover:shadow-2xl transition-all duration-200 group relative overflow-hidden"
            style={{ minHeight: '300px' }}
        >

            {/* Avatar */}
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 text-3xl font-bold shadow mb-4 z-10 border-4 border-white">
                {doctor.name ? doctor.name.charAt(0) : 'D'}
            </div>

            {/* Specialty badge */}
            <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-semibold mb-2 z-10 border border-purple-200">
                {doctor.specialty}
            </span>

            {/* Name */}
            <h2 className="text-2xl font-bold text-gray-900 mb-1 z-10 group-hover:text-blue-700 transition-colors duration-200">
                {doctor.name}
            </h2>

            {/* Rating */}
            <div className="flex items-center justify-center gap-1 mb-4 z-10">
                {Array.from({ length: 5 }).map((_, i) => (
                    <svg
                        key={i}
                        className={`w-4 h-4 ${i < Math.round(doctor.rating) ? 'text-yellow-400' : 'text-gray-300'}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                    >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.175c.969 0 1.371 1.24.588 1.81l-3.38 2.455a1 1 0 00-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.38-2.454a1 1 0 00-1.175 0l-3.38 2.454c-.784.57-1.838-.196-1.54-1.118l1.287-3.966a1 1 0 00-.364-1.118L2.05 9.394c-.783-.57-.38-1.81.588-1.81h4.175a1 1 0 00.95-.69l1.286-3.967z" />
                    </svg>
                ))}
                <span className="ml-1 text-xs text-gray-500">({doctor.rating})</span>
            </div>

            {/* Book button */}
            <button
                className="px-6 py-2 bg-white border-2 border-blue-600 text-blue-600 rounded-lg font-semibold shadow hover:border-purple-600 hover:text-purple-600 transition-all duration-200 mt-auto w-full"
                onClick={onClick}
            >
                View Profile
            </button>
        </div>
    );
}
