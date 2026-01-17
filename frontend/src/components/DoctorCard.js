export default function DoctorCard({ doctor, onClick }) {
    return (
        <div
            className="rounded-lg bg-white shadow-md overflow-hidden flex flex-col items-center text-center hover:shadow-xl hover:-translate-y-2 transition-all duration-300 cursor-pointer group"
            onClick={onClick}
        >
            {/* Doctor Image */}
            <div className="w-full h-48 bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center overflow-hidden relative">
                {doctor.image ? (
                    <img 
                        src={doctor.image} 
                        alt={doctor.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl font-bold text-blue-300 group-hover:text-blue-400 transition-colors duration-300">
                        {doctor.name ? doctor.name.charAt(0) : 'D'}
                    </div>
                )}
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-blue-600 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
            </div>

            {/* Content */}
            <div className="w-full p-4">
                {/* Availability Status */}
                <div className="flex items-center justify-center gap-2 mb-3">
                    <span className={`w-2 h-2 rounded-full group-hover:scale-125 transition-transform duration-300 ${
                        doctor.is_available ? 'bg-green-500' : 'bg-red-500'
                    }`}></span>
                    <span className={`text-sm font-semibold transition-colors duration-300 ${
                        doctor.is_available 
                            ? 'text-green-600 group-hover:text-green-700' 
                            : 'text-red-600 group-hover:text-red-700'
                    }`}>
                        {doctor.is_available ? 'Available' : 'Unavailable'}
                    </span>
                </div>

                {/* Name */}
                <h2 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors duration-300">
                    {doctor.name}
                </h2>

                {/* Specialty */}
                <p className="text-gray-600 text-sm group-hover:text-gray-800 transition-colors duration-300">
                    {doctor.specialty}
                </p>
            </div>
        </div>
    );
}
