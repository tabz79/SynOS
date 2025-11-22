namespace SynOS.Models.DTOs
{
    // A generic wrapper to match the { "data": ... } response structure.
    public class ApiResponse<T>
    {
        public T Data { get; set; }

        public ApiResponse(T data)
        {
            Data = data;
        }
    }
}
